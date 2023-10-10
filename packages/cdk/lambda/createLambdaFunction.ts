import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateLambdaFunctionRequest } from 'generative-ai-use-cases-jp';
import { CreateFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import JSZip = require('jszip');

const zip = new JSZip();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: CreateLambdaFunctionRequest = JSON.parse(event.body!);
    const zipFileName = req.runtime === 'python3.11' ? 'index.py' : 'index.js'
    zip.file(zipFileName, req.code);
    const zipFile = await zip.generateAsync({ type: 'uint8array' });

    const client = new LambdaClient({});
    const command = new CreateFunctionCommand({
      FunctionName: req.functionName,
      Code: {
        ZipFile: zipFile,
      },
      Runtime: req.runtime,
      Role: req.role,
      Handler: 'index.handler',
    });

    await client.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({}),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: (error as Error).stack }),
    };
  }
};
