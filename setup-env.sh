#!/bin/bash

set -eu

STACK_NAME='GenerativeAiUseCasesStack'

function stack_output {
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
        --output text
}

echo 'Setup environment variables...'

export VITE_APP_API_ENDPOINT=`stack_output 'ApiEndpoint'`
export VITE_APP_REGION=`stack_output 'Region'`
export VITE_APP_USER_POOL_ID=`stack_output 'UserPoolId'`
export VITE_APP_USER_POOL_CLIENT_ID=`stack_output 'UserPoolClientId'`
export VITE_APP_IDENTITY_POOL_ID=`stack_output 'IdPoolId'`
export VITE_APP_PREDICT_STREAM_FUNCTION_ARN=`stack_output PredictStreamFunctionArn`
export VITE_APP_CREATE_FUNCTION_ROLE_ARN=`stack_output CreateFunctionRoleArn`
