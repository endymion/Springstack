import { RemovalPolicy, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class SpringstackDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const siteBucket = new s3.Bucket(this, 'SpringstackDemoBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.NONE,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    new s3deploy.BucketDeployment(this, 'SpringstackDemoDeployment', {
      sources: [s3deploy.Source.asset('../apps/demo/dist')],
      destinationBucket: siteBucket
    });

    new CfnOutput(this, 'WebsiteURL', {
      value: siteBucket.bucketWebsiteUrl
    });
  }
}
