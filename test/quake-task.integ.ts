import * as cdk from 'aws-cdk-lib';
import * as aws_stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as aws_stepfunctions_tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { QuakeInfrastructure } from '../src/constructs/quake-infrastructure';
import { QuakeTaskDefinition } from '../src/constructs/quake-task-definition';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'integ-quake-task');

const quakeInfrastructure = new QuakeInfrastructure(stack, 'QuakeInfrastructure');
const taskDefinition = new QuakeTaskDefinition(stack, 'TaskDefinition');

// Run this state machine to start and stop a quake server to test.
new aws_stepfunctions.StateMachine(stack, 'StartQuake', {
  definition: new aws_stepfunctions_tasks.EcsRunTask(stack, 'StartQuakeState', {
    cluster: quakeInfrastructure.cluster,
    taskDefinition: taskDefinition,
    launchTarget: new aws_stepfunctions_tasks.EcsFargateLaunchTarget(),
    integrationPattern: aws_stepfunctions.IntegrationPattern.RUN_JOB,
    assignPublicIp: true,
    securityGroups: [quakeInfrastructure.quakeSecurityGroup],
    timeout: cdk.Duration.minutes(30),
  }),
});
