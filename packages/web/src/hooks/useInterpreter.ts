import {
  CreateLambdaFunctionRequest,
  UpdateLambdaFunctionRequest,
} from 'generative-ai-use-cases-jp';
import useHttp from './useHttp';

const useInterpreter = () => {
  const http = useHttp();
  return {
    existsFunction: async (functionName: string) => {
      const res = await http.getOnce<string>(
        `interpreter/lambda/arn/${functionName}`
      );
      return res.data !== '';
    },
    createFunction: (params: CreateLambdaFunctionRequest) => {
      return http.post<object, CreateLambdaFunctionRequest>(
        'interpreter/lambda',
        params
      );
    },
    updateFunction: (params: UpdateLambdaFunctionRequest) => {
      return http.put<object, UpdateLambdaFunctionRequest>(
        'interpreter/lambda',
        params
      );
    },
  };
};

export default useInterpreter;
