#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ApiCFTStack } from "../lib/api-cft-stack";
import * as dotenv from "dotenv";

dotenv.config();

const app = new cdk.App();
new ApiCFTStack(
  app,
  `${process.env.APP_ENV}-ApiCFTStack`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appEnv: process.env.APP_ENV!,
  }
);
