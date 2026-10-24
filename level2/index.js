import express from "express"
import dotenv from "dotenv"
import { ChatGoogle } from "@langchain/google";
import { TavilySearch } from "@langchain/tavily";
import {createAgent, tool} from "langchain"
import z from "zod";



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

const model = new ChatGoogle("gemini-3.5-flash")

app.post("/chat",async (req,res)=>{

    const{prompt} = req.body
    const agent = createAgent({

           model:model,
           tools:[searchTool,tool1]

    })

    const result = await agent.invoke({

        messages:[
            {
                role:"user",
                content:prompt
            }
        ]
    })

    return res.json(result.messages[result.messages.length-1].content)
})

app.listen(port,()=>{
    console.log(`Server started on port ${port}`)
})