import { App } from 'aws-cdk-lib';
import { RedshiftDemoStack } from './redshift';
import { devEnv } from './shared/environment';
import { TagsProp } from './shared/tagging';

const app = new App();

new RedshiftDemoStack(app, `${devEnv.pattern}-${devEnv.stage}-redshift-demo`, devEnv, {
  description: 'CDK Redshift demo',
  env: devEnv,
  tags: TagsProp('redshift', devEnv)
});

app.synth();