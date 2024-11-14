import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class AwsLambdaComprehensiveStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      userVerification: { emailStyle: cognito.VerificationEmailStyle.CODE },
      signInAliases: { email: true }
    });

    // authorizer 
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'APIAuthorizer', {
      cognitoUserPools: [userPool]
    })

    // API Gateway
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'Comprehensive API',
      description: 'API Gateway with Lambda integration.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'MetadataTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 Bucket
    const bucket = new s3.Bucket(this, 'FilesBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // SNS Topic
    const topic = new sns.Topic(this, 'NotificationsTopic');

    // SQS Queue
    const queue = new sqs.Queue(this, 'MessagesQueue');

    // Secrets Manager
    const secret = new secretsmanager.Secret(this, 'MySecret', {
      secretName: 'MySecret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'user' }),
        generateStringKey: 'password',
      },
    });

    //VPC with NAT Gateways
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2,
      natGateways: 1
    })

    // Security Group for EC2 Instances
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'SecurityGroup for ec2 Instances'
    })

    // Allow inbound HTTP and HTTPS
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');

    // AMI for EC2 Instances
    const ami = new ec2.AmazonLinuxImage();
    // Auto Scaling Group
    const asg = new autoscaling.AutoScalingGroup(this, 'MyASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ami,
      securityGroup: ec2SecurityGroup,
      minCapacity: 1,
      maxCapacity: 3,
    });

    // Load Balancer Security Group
    const lbSecurityGroup = new ec2.SecurityGroup(this, 'LBSecurityGroup', {
      vpc,
      allowAllOutbound: true
    })

    lbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'ALLOW HTTP')
    lbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'ALLOW HTTPS')

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      securityGroup: lbSecurityGroup
    })

    // Listener and target Group
    const listener = alb.addListener('Listener', {
      port: 80,
      open: true,
    })

    listener.addTargets('Target', {
      port: 80,
      targets: [asg]
    })


    const peerVpc = new ec2.Vpc(this, 'PeerVpc', {
      maxAzs: 2,
      natGateways: 1
    });

    // VPC Peering Connection
    const peeringConnection = new ec2.CfnVPCPeeringConnection(this, 'VpcPeering', {
      vpcId: vpc.vpcId,
      peerVpcId: peerVpc.vpcId,
    });

    // Update route tables for peering
    vpc.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnRoute(this, `RouteToPeer${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: peerVpc.vpcCidrBlock,
        vpcPeeringConnectionId: peeringConnection.ref,
      });
    });

    peerVpc.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnRoute(this, `RouteFromPeer${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: vpc.vpcCidrBlock,
        vpcPeeringConnectionId: peeringConnection.ref,
      });
    });


    // Lambda Function
    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      environment: {
        // AWS_REGION: this.region,
        DYNAMODB_TABLE: table.tableName,
        S3_BUCKET: bucket.bucketName,
        SNS_TOPIC_ARN: topic.topicArn,
        SQS_QUEUE_URL: queue.queueUrl,
        SECRET_ID: secret.secretArn,
      },
      vpc,
      securityGroups: [ec2SecurityGroup]
    });

    // Grant permissions
    table.grantReadWriteData(lambdaFunction);
    bucket.grantReadWrite(lambdaFunction);
    topic.grantPublish(lambdaFunction);
    queue.grantSendMessages(lambdaFunction);
    secret.grantRead(lambdaFunction);

    // Add IAM Policies if needed
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "secretsmanager:GetSecretValue",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "s3:PutObject",
        "s3:GetObject",
        "sns:Publish",
        "sqs:SendMessage",
      ],
      resources: [
        table.tableArn,
        bucket.bucketArn + "/*",
        topic.topicArn,
        queue.queueArn,
        secret.secretArn,
      ],
    }));

    // Integrate Lambda with API Gateway
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);
    const resource = api.root.addResource('action');
    resource.addMethod('POST', lambdaIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
    });

    // Output the API endpoint
    new cdk.CfnOutput(this, 'APIEndpoint', { value: api.url ?? 'Something went wrong' });
  }
}

