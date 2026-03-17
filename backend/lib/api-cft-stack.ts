import * as path from "node:path";
import * as esbuild from "esbuild";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

interface StackProps extends cdk.StackProps {
  appEnv: string;
}

export class ApiCFTStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const environment = props.appEnv as "dev" | "prod";

    const createLambda = (
      lambdaName: string,
      handler: string,
      lambdaEnvironment?: Record<string, string>,
      timeoutSeconds: number = 10,
    ) => {
      const entry = path.join(
        __dirname,
        `../lambdas/${handler.split(".")[0]}.js`,
      );
      const outdir = path.join(__dirname, "../build/lambdas");

      // Bundle the Lambda code with esbuild
      esbuild.buildSync({
        entryPoints: [entry],
        bundle: true,
        platform: "node",
        target: "node18",
        outdir: outdir,
        external: ["aws-sdk"],
      });

      return new lambda.Function(this, `${environment}-${lambdaName}`, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: handler,
        code: lambda.Code.fromAsset(outdir),
        environment: {
          APP_ENVIRONMENT: environment,
          ...lambdaEnvironment,
        },
        timeout: cdk.Duration.seconds(timeoutSeconds),
      });
    };

    /**
     * Create the DynamoDB tables
     * ------------------------------------------------------------------------------------------------------------------------------------
     */

    const createTable = (tableName: string) =>
      new dynamodb.Table(this, tableName, {
        tableName: `${environment}-${tableName}`,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        timeToLiveAttribute: "ttl",
        removalPolicy:
          environment === "prod"
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY,
      });

    // Contributors table with GSIs
    const contributorsTable = createTable("CFT-Contributors");
    contributorsTable.addGlobalSecondaryIndex({
      indexName: "wallet_address-index",
      partitionKey: { name: "wallet_address", type: dynamodb.AttributeType.STRING },
    });
    contributorsTable.addGlobalSecondaryIndex({
      indexName: "username-index",
      partitionKey: { name: "username", type: dynamodb.AttributeType.STRING },
    });
    contributorsTable.addGlobalSecondaryIndex({
      indexName: "status-index",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "last_active_date", type: dynamodb.AttributeType.STRING },
    });

    // Features table with GSIs
    const featuresTable = createTable("CFT-Features");
    featuresTable.addGlobalSecondaryIndex({
      indexName: "status-index",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_date", type: dynamodb.AttributeType.STRING },
    });
    featuresTable.addGlobalSecondaryIndex({
      indexName: "created_by_id-index",
      partitionKey: { name: "created_by_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_date", type: dynamodb.AttributeType.STRING },
    });
    featuresTable.addGlobalSecondaryIndex({
      indexName: "category-index",
      partitionKey: { name: "category", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_date", type: dynamodb.AttributeType.STRING },
    });

    // Completed features table
    const completedFeaturesTable = createTable("CFT-CompletedFeatures");

    // Tasks table with GSIs
    const tasksTable = createTable("CFT-Tasks");
    tasksTable.addGlobalSecondaryIndex({
      indexName: "feature_id-index",
      partitionKey: { name: "feature_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_date", type: dynamodb.AttributeType.STRING },
    });
    tasksTable.addGlobalSecondaryIndex({
      indexName: "status-index",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_date", type: dynamodb.AttributeType.STRING },
    });
    tasksTable.addGlobalSecondaryIndex({
      indexName: "claimed_by_id-index",
      partitionKey: { name: "claimed_by_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "claimed_date", type: dynamodb.AttributeType.STRING },
    });
    tasksTable.addGlobalSecondaryIndex({
      indexName: "created_by_id-index",
      partitionKey: { name: "created_by_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_date", type: dynamodb.AttributeType.STRING },
    });

    // Contributions table with GSIs
    const contributionsTable = createTable("CFT-Contributions");
    contributionsTable.addGlobalSecondaryIndex({
      indexName: "task_id-index",
      partitionKey: { name: "task_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "submission_date", type: dynamodb.AttributeType.STRING },
    });
    contributionsTable.addGlobalSecondaryIndex({
      indexName: "contributor_id-index",
      partitionKey: { name: "contributor_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "submission_date", type: dynamodb.AttributeType.STRING },
    });
    contributionsTable.addGlobalSecondaryIndex({
      indexName: "status-index",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "submission_date", type: dynamodb.AttributeType.STRING },
    });

    // FeatureDistribution table with GSIs
    const featureDistributionTable = createTable("CFT-FeatureDistribution");
    featureDistributionTable.addGlobalSecondaryIndex({
      indexName: "feature_id-index",
      partitionKey: { name: "feature_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "distribution_date", type: dynamodb.AttributeType.STRING },
    });
    featureDistributionTable.addGlobalSecondaryIndex({
      indexName: "contributor_id-index",
      partitionKey: { name: "contributor_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "distribution_date", type: dynamodb.AttributeType.STRING },
    });
    featureDistributionTable.addGlobalSecondaryIndex({
      indexName: "task_id-index",
      partitionKey: { name: "task_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "distribution_date", type: dynamodb.AttributeType.STRING },
    });
    featureDistributionTable.addGlobalSecondaryIndex({
      indexName: "transaction_status-index",
      partitionKey: { name: "transaction_status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "distribution_date", type: dynamodb.AttributeType.STRING },
    });
    /**
     * Create the Lambda functions
     * ------------------------------------------------------------------------------------------------------------------------------------
     */

    // Contributors Lambda functions
    const updateContributorLambda = createLambda(
      "UpdateContributorLambda",
      "update-contributor.handler",
      {
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
    );
    contributorsTable.grantReadWriteData(updateContributorLambda);

    const getContributorLambda = createLambda(
      "GetContributorLambda",
      "get-contributor.handler",
      {
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
    );
    contributorsTable.grantReadWriteData(getContributorLambda);

    const getContributorsLambda = createLambda(
      "GetContributorsLambda",
      "get-contributors.handler",
      {
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
    );
    contributorsTable.grantReadWriteData(getContributorsLambda);

    // Features Lambda functions
    const createFeatureLambda = createLambda(
      "CreateFeatureLambda",
      "create-feature.handler",
      {
        FEATURES_TABLE_NAME: featuresTable.tableName,
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
    );
    featuresTable.grantReadWriteData(createFeatureLambda);
    contributorsTable.grantReadData(createFeatureLambda);

    const updateFeatureLambda = createLambda(
      "UpdateFeatureLambda",
      "update-feature.handler",
      {
        FEATURES_TABLE_NAME: featuresTable.tableName,
      },
    );
    featuresTable.grantReadWriteData(updateFeatureLambda);

    const getFeatureLambda = createLambda(
      "GetFeatureLambda",
      "get-feature.handler",
      {
        FEATURES_TABLE_NAME: featuresTable.tableName,
      },
    );
    featuresTable.grantReadData(getFeatureLambda);

    const getFeaturesLambda = createLambda(
      "GetFeaturesLambda",
      "get-features.handler",
      {
        FEATURES_TABLE_NAME: featuresTable.tableName,
      },
    );
    featuresTable.grantReadData(getFeaturesLambda);

    const deleteFeatureLambda = createLambda(
      "DeleteFeatureLambda",
      "delete-feature.handler",
      {
        FEATURES_TABLE_NAME: featuresTable.tableName,
      },
    );
    featuresTable.grantReadWriteData(deleteFeatureLambda);

    const completeFeatureLambda = createLambda(
      "CompleteFeatureLambda",
      "mark-feature-completed.handler",
      {
        FEATURES_TABLE_NAME: featuresTable.tableName,
        COMPLETED_FEATURES_TABLE_NAME: completedFeaturesTable.tableName,
      },
    );
    featuresTable.grantReadWriteData(completeFeatureLambda);
    completedFeaturesTable.grantReadWriteData(completeFeatureLambda);

    const getCompletedFeatureLambda = createLambda(
      "GetCompletedFeatureLambda",
      "get-completed-feature.handler",
      {
        COMPLETED_FEATURES_TABLE_NAME: completedFeaturesTable.tableName,
      },
    );
    completedFeaturesTable.grantReadData(getCompletedFeatureLambda);

    const getCompletedFeaturesLambda = createLambda(
      "GetCompletedFeaturesLambda",
      "get-completed-features.handler",
      {
        COMPLETED_FEATURES_TABLE_NAME: completedFeaturesTable.tableName,
      },
    );
    completedFeaturesTable.grantReadData(getCompletedFeaturesLambda);

    // Tasks Lambda functions
    const createTaskLambda = createLambda(
      "CreateTaskLambda",
      "create-task.handler",
      {
        TASKS_TABLE_NAME: tasksTable.tableName,
        FEATURES_TABLE_NAME: featuresTable.tableName,
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
    );
    tasksTable.grantReadWriteData(createTaskLambda);
    featuresTable.grantReadData(createTaskLambda);
    contributorsTable.grantReadData(createTaskLambda);

    const updateTaskLambda = createLambda(
      "UpdateTaskLambda",
      "update-task.handler",
      {
        TASKS_TABLE_NAME: tasksTable.tableName,
      },
    );
    tasksTable.grantReadWriteData(updateTaskLambda);

    const getTaskLambda = createLambda(
      "GetTaskLambda",
      "get-task.handler",
      {
        TASKS_TABLE_NAME: tasksTable.tableName,
      },
    );
    tasksTable.grantReadData(getTaskLambda);

    const getTasksLambda = createLambda("GetTasksLambda", "get-tasks.handler", {
      TASKS_TABLE_NAME: tasksTable.tableName,
    });
    tasksTable.grantReadData(getTasksLambda);

    const claimTaskLambda = createLambda(
      "ClaimTaskLambda",
      "claim-task.handler",
      {
        TASKS_TABLE_NAME: tasksTable.tableName,
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
    );
    tasksTable.grantReadWriteData(claimTaskLambda);
    contributorsTable.grantReadData(claimTaskLambda);

    const deleteTaskLambda = createLambda(
      "DeleteTaskLambda",
      "delete-task.handler",
      {
        TASKS_TABLE_NAME: tasksTable.tableName,
      },
    );
    tasksTable.grantReadWriteData(deleteTaskLambda);

    // Contributions Lambda functions
    const submitContributionLambda = createLambda(
      "SubmitContributionLambda",
      "submit-contribution.handler",
      {
        CONTRIBUTIONS_TABLE_NAME: contributionsTable.tableName,
        TASKS_TABLE_NAME: tasksTable.tableName,
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
    );
    contributionsTable.grantReadWriteData(submitContributionLambda);
    tasksTable.grantReadWriteData(submitContributionLambda);
    contributorsTable.grantReadData(submitContributionLambda);

    const approveContributionLambda = createLambda(
      "ApproveContributionLambda",
      "approve-contribution.handler",
      {
        CONTRIBUTIONS_TABLE_NAME: contributionsTable.tableName,
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
        TASKS_TABLE_NAME: tasksTable.tableName,
      },
    );
    contributionsTable.grantReadWriteData(approveContributionLambda);
    contributorsTable.grantReadWriteData(approveContributionLambda);
    tasksTable.grantReadWriteData(approveContributionLambda);

    const getContributionLambda = createLambda(
      "GetContributionLambda",
      "get-contribution.handler",
      {
        CONTRIBUTIONS_TABLE_NAME: contributionsTable.tableName,
      },
    );
    contributionsTable.grantReadData(getContributionLambda);

    const getContributionsLambda = createLambda(
      "GetContributionsLambda",
      "get-contributions.handler",
      {
        CONTRIBUTIONS_TABLE_NAME: contributionsTable.tableName,
      },
    );
    contributionsTable.grantReadData(getContributionsLambda);

    // FeatureDistribution Lambda functions
    const createDistributionLambda = createLambda(
      "CreateDistributionLambda",
      "create-distribution.handler",
      {
        FEATURE_DISTRIBUTION_TABLE_NAME: featureDistributionTable.tableName,
        COMPLETED_FEATURES_TABLE_NAME: completedFeaturesTable.tableName,
        CONTRIBUTORS_TABLE_NAME: contributorsTable.tableName,
      },
      30, // Longer timeout for blockchain transactions
    );
    featureDistributionTable.grantReadWriteData(createDistributionLambda);
    completedFeaturesTable.grantReadData(createDistributionLambda);
    contributorsTable.grantReadWriteData(createDistributionLambda);

    const updateDistributionLambda = createLambda(
      "UpdateDistributionLambda",
      "update-distribution.handler",
      {
        FEATURE_DISTRIBUTION_TABLE_NAME: featureDistributionTable.tableName,
      },
    );
    featureDistributionTable.grantReadWriteData(updateDistributionLambda);

    const getDistributionsLambda = createLambda(
      "GetDistributionsLambda",
      "get-distributions.handler",
      {
        FEATURE_DISTRIBUTION_TABLE_NAME: featureDistributionTable.tableName,
      },
    );
    featureDistributionTable.grantReadData(getDistributionsLambda);

    /**
     * Create the API Gateway
     * ------------------------------------------------------------------------------------------------------------------------------------
     */
    // Create an API Gateway
    const api = new apigateway.RestApi(this, `${environment}-CFT-api`, {
      restApiName: `${environment}-CFT-api`,
      description: "Main api for CFT.live application",
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    // Define API Gateway resources
    const contributors = api.root.addResource("contributors");
    const updateContributor = contributors.addResource("update");
    const getContributor = contributors.addResource("get");

    const features = api.root.addResource("features");
    const createFeature = features.addResource("create");
    const updateFeature = features.addResource("update");
    const getFeature = features.addResource("get");
    const deleteFeature = features.addResource("delete");
    const completeFeature = features.addResource("complete");

    const completedFeatures = api.root.addResource("completed-features");
    const getCompletedFeature = completedFeatures.addResource("get");

    const tasks = api.root.addResource("tasks");
    const createTask = tasks.addResource("create");
    const updateTask = tasks.addResource("update");
    const getTask = tasks.addResource("get");
    const claimTask = tasks.addResource("claim");
    const deleteTask = tasks.addResource("delete");

    const contributions = api.root.addResource("contributions");
    const submitContribution = contributions.addResource("submit");
    const approveContribution = contributions.addResource("approve");
    const getContribution = contributions.addResource("get");

    const distributions = api.root.addResource("distributions");
    const createDistribution = distributions.addResource("create");
    const updateDistribution = distributions.addResource("update");

    /**
     * Contributors Endpoints
     * ------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * POST /contributors
     * - Get all contributors with optional filters
      * - Request body: { filter?: { status?, roles?, q? } }
     */
    contributors.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getContributorsLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /contributors/get
     * - Get contributor profile by id or wallet_address
     * - Request body: { id?: string, wallet_address?: string }
     */
    getContributor.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getContributorLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /contributors/update
     * - Create or Update a contributor profile
      * - Request body: { id?, wallet_address, username?, email?, github_username?, telegram_handle?, bio?, profile_image_url?, roles?, status? }
     */
    updateContributor.addMethod(
      "POST",
      new apigateway.LambdaIntegration(updateContributorLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * Features Endpoints
     * ------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * POST /features
     * - Get all features with optional filters
     * - Request body: { filter?: { status?, category?, created_by_id? } }
     */
    features.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getFeaturesLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /features/create
     * - Create a new feature
     * - Request body: { name, description, category, total_tokens_reward, created_by_id, discussion_url? }
     */
    createFeature.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createFeatureLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /features/update
     * - Update an existing feature
     * - Request body: { id, name?, description?, category?, total_tokens_reward?, status?, discussion_url? }
     */
    updateFeature.addMethod(
      "POST",
      new apigateway.LambdaIntegration(updateFeatureLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /features/get
     * - Get feature detail by id
     * - Request body: { id: string }
     */
    getFeature.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getFeatureLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /features/delete
     * - Delete a feature by id
     * - Request body: { id: string }
     */
    deleteFeature.addMethod(
      "POST",
      new apigateway.LambdaIntegration(deleteFeatureLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /features/complete
     * - Mark an active feature as completed and move it to the completed-features table
     * - Request body: { id: string, completed_by_id: string }
     */
    completeFeature.addMethod(
      "POST",
      new apigateway.LambdaIntegration(completeFeatureLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /completed-features
     * - Get all completed features with optional filters
     * - Request body: { filter?: { category?, created_by_id?, q? } }
     */
    completedFeatures.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getCompletedFeaturesLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /completed-features/get
     * - Get a completed feature by id
     * - Request body: { id: string }
     */
    getCompletedFeature.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getCompletedFeatureLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * Tasks Endpoints
     * ------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * POST /tasks
     * - Get tasks with optional filters
     * - Request body: { filter?: { status?, feature_id?, claimed_by_id?, created_by_id?, task_type? } }
     */
    tasks.addMethod("POST", new apigateway.LambdaIntegration(getTasksLambda), {
      apiKeyRequired: true,
    });

    /**
     * POST /tasks/create
     * - Create a new task
     * - Request body: { feature_id, name, description, task_type, acceptance_criteria, created_by_id }
     */
    createTask.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createTaskLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /tasks/update
     * - Update an existing task
     * - Request body: { id, name?, description?, task_type?, acceptance_criteria?, status? }
     */
    updateTask.addMethod(
      "POST",
      new apigateway.LambdaIntegration(updateTaskLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /tasks/get
     * - Get task detail by id
     * - Request body: { id: string }
     */
    getTask.addMethod("POST", new apigateway.LambdaIntegration(getTaskLambda), {
      apiKeyRequired: true,
    });

    /**
     * POST /tasks/claim
     * - Claim a task for a contributor
     * - Request body: { task_id, contributor_id }
     */
    claimTask.addMethod(
      "POST",
      new apigateway.LambdaIntegration(claimTaskLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /tasks/delete
     * - Delete a task by id
     * - Request body: { id: string }
     */
    deleteTask.addMethod(
      "POST",
      new apigateway.LambdaIntegration(deleteTaskLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * Contributions Endpoints
     * ------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * POST /contributions
     * - Get all contributions with optional filters
     * - Request body: { filter?: { task_id?, contributor_id?, status? } }
     */
    contributions.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getContributionsLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /contributions/submit
     * - Submit a contribution for a task
     * - Request body: { task_id, contributor_id, submitted_work_url, submission_notes?, github_pr_number? }
     */
    submitContribution.addMethod(
      "POST",
      new apigateway.LambdaIntegration(submitContributionLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /contributions/approve
     * - Approve or reject a contribution
     * - Request body: { contribution_id, approver_id, status, cp_awarded?, approval_notes? }
     */
    approveContribution.addMethod(
      "POST",
      new apigateway.LambdaIntegration(approveContributionLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /contributions/get
     * - Get contribution detail by id
     * - Request body: { id: string }
     */
    getContribution.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getContributionLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * FeatureDistribution Endpoints
     * ------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * POST /distributions
     * - Get all distributions with optional filters
     * - Request body: { filter?: { feature_id?, contributor_id?, transaction_status? } }
     */
    distributions.addMethod(
      "POST",
      new apigateway.LambdaIntegration(getDistributionsLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /distributions/create
     * - Create a new distribution (payout)
     * - Request body: { feature_id, contributor_id, cp_amount, token_amount, approver_id }
     */
    createDistribution.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createDistributionLambda),
      {
        apiKeyRequired: true,
      },
    );

    /**
     * POST /distributions/update
     * - Update distribution status with transaction hash
     * - Request body: { id, transaction_status, arbitrum_tx_hash? }
     */
    updateDistribution.addMethod(
      "POST",
      new apigateway.LambdaIntegration(updateDistributionLambda),
      {
        apiKeyRequired: true,
      },
    );

    // Create an API Key
    const apiKey = api.addApiKey(`${environment}-CFTApiGWKey`, {
      apiKeyName: `${environment}-CFTApiGWKey`,
      description: "API Key for CFT API Gateway",
    });

    // Create a Usage Plan
    const usagePlan = api.addUsagePlan("CFTApiGWUsagePlan", {
      name: `${environment}-CFTApiGWUsagePlan`,
      description: "Usage plan for CFT API Gateway",
      apiStages: [
        {
          api: api,
          stage: api.deploymentStage,
        },
      ],
      // Throttle and quota settings can be added here later if API traffic requires it.
    });

    // Associate the API Key with the Usage Plan
    usagePlan.addApiKey(apiKey);
  }
}
