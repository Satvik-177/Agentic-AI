import express from "express"
import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai";

dotenv.config()

const port = process.env.PORT || 5000
const app = express()

app.use(express.json())

const ai = new GoogleGenAI({
    apiKey:process.env.GEMINI_API_KEY
});

// const main = async()=>{

//     const response = await ai.interactions.create({
//         model:"gemini-3.8-flash",
//         input:"hello"
//     })

//     console.log(response.output_text)
// }

// main()

app.post("/chat",async(req,res)=>{

    const{prompt} = req.body

    const response = await ai.interactions.create({
        model:"gemini-3.8-flash",
        input:prompt
    })

    return res.json(response.output_text)
})

app.listen(port,()=>{
    console.log(`Server started on port ${port}`)
})