import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

const server = new McpServer({
    title:"calculator",
    version:"1.0.0"
})

server.registerTool(
    "addition",
    {
        description:"for adding two numbers",
        inputSchema:z.object({
            a:z.number(),
            b:z.number()
        })
    },

    async({a,b})=>{

        return{

            content:[
                {
                    type:"text",
                    text:`Sum using MCP tool is ${a} and ${b} is ${a+b}`
                }
            ]
        }
    }
)

const transport = new StdioServerTransport()

server.connect(transport)