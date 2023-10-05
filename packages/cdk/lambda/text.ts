import * as fflate from 'fflate';
import * as fs from 'fs';
import JSZip = require('jszip');

const zip = new JSZip();

import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';

(async () => {
  const client = new LambdaClient({});

  const command = new GetFunctionCommand({
    FunctionName: 'hello-world2',
  });
  const response = await client.send(command).catch((e) => {
    console.log('Error', e.$metadata.httpStatusCode);
  });
  // console.log('OK', response);

  //   zip.file(
  //     'index.js',
  //     `exports.handler = async (event) => {
  //  // 関数を呼び出されたら、"Hello World"をレスポンスとして返す
  //  const response = {
  //    statusCode: 200,
  //    body: 'Hello World'
  //  };

  //  return response;
  // };
  // `
  //   );

  //   const content = await zip.generateAsync({ type: 'uint8array' });
  //   fs.writeFileSync('data.zip', Buffer.from(content));
  //   //   const a = fflate.compressSync(
  //     fflate.strToU8(`exports.handler = async (event) => {
  //  // 関数を呼び出されたら、"Hello World"をレスポンスとして返す
  //  const response = {
  //    statusCode: 200,
  //    body: 'Hello World'
  //  };

  //  return response;
  // };
  // `),
  //     {
  //       filename: '/function.js',
  //     }
  //   );

  // fs.writeFileSync('data.zip', Buffer.from(a));
})();
