# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


## Infrastructure Topology Overview

The following infrastructure topology describes a comprehensive AWS setup managed using the AWS CDK, involving a VPC, Lambda functions, networking components, storage, and compute resources. This topological view serves as a blueprint for deploying serverless and scalable workloads.

### VPC (Virtual Private Cloud)

- **Subnets**: Public and Private subnets spread across multiple Availability Zones (AZs).
- **NAT Gateways**: Used in public subnets to enable instances in private subnets to connect to the internet.
- **Route Tables**: Routing configurations set up for each subnet to control traffic flow, including routing to NAT Gateways and VPC Peering connections.

### Security Groups

- **EC2 Security Group**: Allows inbound traffic on ports 80 and 443 (HTTP and HTTPS) and outbound traffic for general access.
- **Load Balancer Security Group**: Manages access control to the ALB (Application Load Balancer).

### EC2 Auto Scaling Group (ASG)

- **Instances**: A set of EC2 instances running within the VPC that can scale based on defined metrics (e.g., CPU usage).
- **AMI (Amazon Machine Image)**: The gold image used to launch EC2 instances.

### Application Load Balancer (ALB)

- **Internet-Facing**: An ALB deployed in the public subnets that distributes incoming traffic across EC2 instances in the ASG.
- **Listeners and Target Groups**: HTTP/HTTPS listeners forwarding requests to target groups consisting of EC2 instances.

### Lambda Function

- **Integrated with API Gateway**: The Lambda function is invoked via an API Gateway REST API, protected by a Cognito User Pool for user authentication.
- **Security**: Lambda is deployed inside the VPC for enhanced security, connected to private subnets, and has an attached security group.
- **Dependencies**: The Lambda function code is contained within the project, with dependencies installed locally.

### API Gateway

- **REST API**: A REST API is configured with endpoints that trigger the Lambda function.
- **Cognito Authorizer**: Secures the API by requiring users to be authenticated through AWS Cognito.

### Cognito User Pool

- **User Management**: Manages user sign-up, sign-in, and authentication for accessing the API Gateway.

### CloudFront and Route 53

- **CloudFront Distribution**: Configured to cache content and serve it globally, integrated with the ALB.
- **Route 53**: DNS routing, mapping domain names to CloudFront distributions or ALB for user-friendly URLs.

### DynamoDB, S3, SNS, and SQS

- **DynamoDB**: Stores metadata or user data processed by Lambda functions.
- **S3 Bucket**: Stores files uploaded via the API and accessed by the Lambda.
- **SNS Topic**: Used for sending notifications based on specific triggers in the system.
- **SQS Queue**: Used for decoupling processes, enabling asynchronous workloads for further Lambda processing.

### Secrets Manager

- **Secure Access**: Used to store sensitive data, such as database credentials or API keys, which Lambda can access securely.

## Detailed Flow Walkthrough

### User Request

- A user initiates a request from a browser or client application, such as accessing a web page or submitting data through a form.

### DNS Resolution with Route 53

- The user's request is first resolved by Amazon Route 53, which maps the domain name to the appropriate CloudFront distribution or Application Load Balancer (ALB).

### CloudFront Distribution

- If the request is for static content (e.g., images, CSS, JavaScript), Amazon CloudFront serves the content directly from its edge locations, ensuring low latency.
- If the request is for dynamic content, CloudFront forwards the request to the Application Load Balancer (ALB).

### Application Load Balancer (ALB)

- The ALB, located in public subnets, receives the request from CloudFront or directly from Route 53 (if CloudFront is not used).
- The ALB then forwards the request to the appropriate EC2 instances in the Auto Scaling Group (ASG), which handle application-level processing.

### EC2 Instances (Auto Scaling Group)

- EC2 instances process the request, which could involve rendering a web page, handling API logic, or interacting with a database.
- The ASG ensures that the number of EC2 instances scales up or down based on traffic patterns to handle load efficiently.

### API Gateway for Serverless Requests

- For specific API requests that require serverless processing, the API Gateway is invoked. The API Gateway acts as an entry point for invoking AWS Lambda functions.

### Cognito User Authentication

- Amazon Cognito is integrated with the API Gateway to authenticate users before allowing them to invoke the Lambda function. Only authenticated users can proceed beyond this point.

### Lambda Function Execution

- The Lambda function processes the request based on the action specified. It can perform multiple operations such as:
  - **Upload to S3**: Store files in Amazon S3.
  - **Save to DynamoDB**: Store metadata or other relevant data in DynamoDB.
  - **Publish to SNS**: Send notifications using Simple Notification Service (SNS).
  - **Send to SQS**: Queue messages for further processing using Simple Queue Service (SQS).
  - **Access Secrets Manager**: Retrieve sensitive information securely from AWS Secrets Manager.

### Data Storage and Processing

- If the Lambda function needs to store or retrieve data, it interacts with DynamoDB for database operations or S3 for file storage.
- DynamoDB is used for storing structured data such as user profiles, metadata, or logs.
- S3 is used for storing unstructured data like uploaded files, images, or documents.

### Notifications and Asynchronous Processing

- If the operation requires notifying users or triggering further actions, the Lambda function publishes messages to SNS topics, which can send notifications via email or SMS.
- For tasks that need to be processed asynchronously, such as heavy computation or background jobs, the Lambda function sends messages to an SQS queue. Another Lambda function or worker instance processes these messages from the queue.

### Secrets Retrieval

- During the execution, if the Lambda function requires access to sensitive information (e.g., database credentials), it retrieves this data from AWS Secrets Manager. This ensures that no sensitive information is hard-coded, enhancing security.

### Response to User

- After processing the request, the Lambda function or EC2 instance sends a response back through API Gateway or ALB, eventually reaching the user via CloudFront (if applicable).
- The response may include data requested by the user, a confirmation message, or any other relevant information.

### Monitoring and Logging

- **CloudWatch Logs**: Used to capture logs from Lambda functions, EC2 instances, and other services for monitoring and debugging purposes.
- **CloudWatch Alarms**: Configured to monitor metrics such as CPU usage, request counts, or error rates, allowing for proactive scaling or alerting when issues arise.

### Service Icons

- **VPC**: ![VPC Icon](https://example.com/vpc-icon.png)
- **Security Groups**: ![Security Group Icon](https://example.com/security-group-icon.png)
- **EC2 ASG**: ![EC2 Icon](https://example.com/ec2-icon.png)
- **ALB**: ![ALB Icon](https://example.com/alb-icon.png)
- **Lambda**: ![Lambda Icon](https://example.com/lambda-icon.png)
- **API Gateway**: ![API Gateway Icon](https://example.com/api-gateway-icon.png)
- **Cognito**: ![Cognito Icon](https://example.com/cognito-icon.png)
- **CloudFront**: ![CloudFront Icon](https://example.com/cloudfront-icon.png)
- **Route 53**: ![Route 53 Icon](https://example.com/route53-icon.png)
- **DynamoDB**: ![DynamoDB Icon](https://example.com/dynamodb-icon.png)
- **S3**: ![S3 Icon](https://example.com/s3-icon.png)
- **SNS**: ![SNS Icon](https://example.com/sns-icon.png)
- **SQS**: ![SQS Icon](https://example.com/sqs-icon.png)
- **Secrets Manager**: ![Secrets Manager Icon](https://example.com/secrets-manager-icon.png)

