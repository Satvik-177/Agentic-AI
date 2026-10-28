import express from "express"
import dotenv from "dotenv"
import { ChatGoogle } from "@langchain/google";
import { TavilySearch } from "@langchain/tavily";
import {createAgent, tool} from "langchain"
import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { ChatGroq } from "@langchain/groq"
import z from "zod";
import { MessagesAnnotation, StateGraph, MemorySaver, StateSchema, interrupt } from "@langchain/langgraph";
import { randomUUID } from "crypto";


dotenv.config()

const port = process.env.PORT || 5000
const app = express()

app.use(express.json())

//short-term memory saver locally

// const checkpointer = new MemorySaver();

//short-term memory saver in  production

const client = new MongoClient("mongodb+srv://satvikanand1205_db_user:tCtkcRrO5uqn1DyK@cluster0.irix3ek.mongodb.net/");
const checkpointer = new MongoDBSaver({ client });

//built-in tool

// const searchTool = new TavilySearch({

//   maxResults: 5,
//   topic: "general",

// });

//custom tool

// const tool1 = tool(
//     ({email,content})=>{
//         return `email sent successfully with email ${email} and content ${content}`
//     },
//     {
//         name:"email_send_tool",
//         description:"use this tool to send email",
//         schema:z.object({
//             email:z.string().describe("sender email"),
//             content:z.string().describe("mail content for sending")
//         })
//     }
// )

// const tools = [searchTool,tool1]

// const model = new ChatGoogle("gemini-3.5-flash").bindTools(tools)

// const toolNode = new ToolNode(tools)

// const agent = async(state)=>{
//     const result = await model.invoke(
//         state.messages
//     )
//     return{
//         messages:[result]
//     }
// }

// const shouldContinue = async(state)=>{

//     console.log(state)
//     if(state.messages[state.messages.length-1].tool_calls.length>0){
//         return "tool_node"
//     }
//     else{
//         return "__end__"
//     }
// }

// const graph = new StateGraph(MessagesAnnotation)
// .addNode("agent",agent)
// .addNode("tool_node",toolNode)
// .addEdge("__start__","agent")
// .addConditionalEdges("agent",shouldContinue)
// .addEdge("tool_node","agent")
// .compile({checkpointer})


// app.post("/chat",async (req,res)=>{

//     const{prompt} = req.body

//     const result = await graph.invoke(
//         {
//         messages:[
        
//             {
//                 role:"user",
//                 content:prompt

//             }
//         ]
//     },
//     {
//         configurable:{thread_id:"1"}
//     }

// )

//     return res.json(result.messages[result.messages.length-1].content)

// })

const customState = new StateSchema({
    prompt: z.string(),
    approvalRequires: z.boolean(),
    aiResponse: z.string(),
    approved: z.boolean(),
    result: z.string()
});

const model = new ChatGroq({
    model: "openai/gpt-oss-120b"
});

const agent = async (state) => {

    const result = await model.invoke([
        {
            role: "system",
            content: `You are a helpful assistant.

If the user is greeting or asking a normal question,
respond normally and set approvalRequires to false.

If the request requires a sensitive external action,
such as sending an email or deleting a file,
set approvalRequires to true.

Return JSON with:
{
  "response": "your response",
  "approvalRequires": true or false
}`
        },
        {
            role: "user",
            content: state.prompt
        }
    ]);

    const parsed = JSON.parse(result.content);

    return {
        aiResponse: parsed.response,
        approvalRequires: parsed.approvalRequires
    };
};

const approvalNode = async (state) => {

    const answer = interrupt({
        message: "Do you approve this action?",
        prompt: state.prompt,
        aiResponse: state.aiResponse
    });

    return {
        approved: String(answer).trim().toLowerCase() === "yes"
    };
};

const actionNode = async (state) => {

    if (state.approved) {
        return {
            result: "action approved"
        };
    }

    return {
        result: "action rejected by human"
    };
};

const shouldContinue = (state) => {

    if (state.approvalRequires) {
        return "approval";
    }

    return "__end__";
};

const graph = new StateGraph(customState)
    .addNode("agent", agent)
    .addNode("approval", approvalNode)
    .addNode("action", actionNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("approval", "action")
    .addEdge("action", "__end__")
    .compile({ checkpointer });

app.post("/chat", async (req, res) => {

    const { prompt } = req.body;
    const threadId = randomUUID();

    const result = await graph.invoke(
        {
            prompt
        },
        {
            configurable: {
                thread_id: threadId
            }
        }
    );

    return res.json({
        threadId,
        result: result.result,
        ai: result.aiResponse,
        interrupt: result.__interrupt__
    });
});

app.post("/chat/resume", async (req, res) => {

    const { threadId, answer } = req.body;

    const result = await graph.invoke(
        new Command({
            resume: String(answer)
        }),
        {
            configurable: {
                thread_id: threadId
            }
        }
    );

    return res.json({
        threadId,
        result: result.result
    });
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});