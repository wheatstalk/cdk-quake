const { awscdk } = require('projen');

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: '@wheatstalk/cdk-quake',

  deps: [
    '@vendia/serverless-express',
    'express',
    'morgan',
    'body-parser',
    'aws-sdk',
    'source-map-support',
  ],

  devDeps: [
    '@types/aws-lambda',
    '@types/express',
    '@types/morgan',
    '@wheatstalk/aws-cdk-exec',
  ],

  integrationTestAutoDiscover: false,
});

new awscdk.IntegrationTestAutoDiscover(project, {
  cdkDeps: project.cdkDeps,
  testdir: project.testdir,
  tsconfigPath: project.tsconfigDev.fileName,
  integrationTestOptions: {
    pathMetadata: true,
  },
});

project.addGitIgnore('/.idea');

project.addTask('integ:main:test', {
  exec: 'cdk-exec --app test/.tmp/main/deploy.cdk.out',
});

project.addTask('integ:quake-task:test', {
  exec: 'cdk-exec --app test/.tmp/quake-task/deploy.cdk.out',
});

project.upgradeWorkflow.postUpgradeTask.spawn(
  project.tasks.tryFind('integ:snapshot-all'),
);

project.synth();