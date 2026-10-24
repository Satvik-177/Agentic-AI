import express from "express"
import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai";
import { ChatGoogle } from "@langchain/google";
import { ChatGroq } from "@langchain/groq";

dotenv.config()

const port = process.env.PORT || 5000
const app = express()

app.use(express.json())

// const ai = new GoogleGenAI({
//     apiKey:process.env.GEMINI_API_KEY
// });

// const main = async()=>{

//     const response = await ai.interactions.create({
//         model:"gemini-3.8-flash",
//         input:"hello"
//     })

//     console.log(response.output_text)
// }

// main()

// app.post("/chat",async(req,res)=>{

//     const{prompt} = req.body

//     const response = await ai.interactions.create({
//         model:"gemini-3.8-flash",
//         input:prompt
//     })

//     return res.json(response.output_text)
// })

app.post("/chat",async(req,res)=>{

    const {prompt} = req.body
    const ai = new ChatGroq({

        model:"openai/gpt-oss-120b",
        temperature:0.7,
        maxOutputTokens:1000

    })

    const result = await ai.invoke([
        {
            role:"system",
            content:"Your name is jarvis and you are my AI assisstant"
        },
        {
            role:"user",
            content:prompt
        }
    ])

    return res.json(result.content)
})

app.listen(port,()=>{
    console.log(`Server started on port ${port}`)
})