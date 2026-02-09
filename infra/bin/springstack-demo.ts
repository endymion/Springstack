import { App } from 'aws-cdk-lib';
import { SpringstackDemoStack } from '../lib/springstack-demo-stack';

const app = new App();

new SpringstackDemoStack(app, 'SpringstackDemoStack');
