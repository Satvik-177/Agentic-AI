import express from "express"
import dotenv from "dotenv"
import { ChatGoogle } from "@langchain/google";
import { TavilySearch } from "@langchain/tavily";
import {createAgent, tool} from "langchain"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import z from "zod";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { threadId } from "worker_threads";


dotenv.config()

const port = process.env.PORT || 5000
const app = express()

app.use(express.json())


//built-in tool

const searchTool = new TavilySearch({

  maxResults: 5,
  topic: "general",

});

//custom tool

const tool1 = tool(
    ({email,content})=>{
        return `email sent successfully with email ${email} and content ${content}`
    },
    {
        name:"email_send_tool",
        description:"use this tool to send email",
        schema:z.object({
            email:z.string().describe("sender email"),
            content:z.string().describe("mail content for sending")
        })
    }
)

const tools = [searchTool,tool1]

const model = new ChatGoogle("gemini-3.5-flash").bindTools(tools)

const toolNode = new ToolNode(tools)

const agent = async(state)=>{
    const result = await model.invoke(
        state.messages
    )
    return{
        messages:[result]
    }
}

const shouldContinue = async(state)=>{

    console.log(state)
    if(state.messages[state.messages.length-1].tool_calls.length>0){
        return "tool_node"
    }
    else{
        return "__end__"
    }
}

const graph = new StateGraph(MessagesAnnotation)
.addNode("agent",agent)
.addNode("tool_node",toolNode)
.addEdge("__start__","agent")
.addConditionalEdges("agent",shouldContinue)
.addEdge("tool_node","agent")
.compile()


app.post("/chat",async (req,res)=>{

    const{prompt} = req.body

    const result = await graph.invoke(
        {
        messages:[
        
            {
                role:"user",
                content:prompt

            }
        ]
    }
)

    return res.json(result.messages[result.messages.length-1].content)

})

app.listen(port,()=>{
    console.log(`Server started on port ${port}`)
})