import * as path from 'path';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import {
  ENV_QUAKE_TABLE,
  ENV_QUAKE_TASK_CLUSTER,
  ENV_QUAKE_TASK_DEFINITION,
  ENV_QUAKE_TASK_SECURITY_GROUPS,
  ENV_QUAKE_TASK_SUBNETS,
} from '../constants';
import { QuakeData } from './quake-data';
import { QuakeInfrastructure } from './quake-infrastructure';
import { QuakeTaskDefinition } from './quake-task-definition';

export interface QuakeApiProps {
  readonly quakeData: QuakeData;
  readonly quakeInfrastructure: QuakeInfrastructure;
}

export class QuakeApi extends Construct {
  public readonly baseUrl: string;

  constructor(scope: Construct, id: string, props: QuakeApiProps) {
    super(scope, id);

    const quakeTaskDefinition = new QuakeTaskDefinition(this, 'QuakeTaskDefinition');

    const restApiHandler = new RuntimeFunction(this, 'Handler', {
      handler: 'handler',
      quakeData: props.quakeData,
      quakeInfrastructure: props.quakeInfrastructure,
      quakeTaskDefinition,
    });

    const restApi = new LambdaRestApi(this, 'RestApi', {
      handler: restApiHandler,
      deployOptions: {
        tracingEnabled: true,
      },
    });

    this.baseUrl = restApi.deploymentStage.urlForPath('/');
  }
}

export interface RuntimeFunctionProps {
  readonly handler: string;
  readonly quakeInfrastructure: QuakeInfrastructure;
  readonly quakeTaskDefinition: QuakeTaskDefinition;
  readonly quakeData?: QuakeData;
}

export class RuntimeFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: RuntimeFunctionProps) {
    super(scope, id, {
      entry: path.join('src/runtime/lambda.ts'),
      handler: props.handler,
      tracing: Tracing.ACTIVE,
      bundling: {
        sourceMap: true,
      },
    });

    const { quakeData, quakeInfrastructure, quakeTaskDefinition } = props;

    if (quakeData) {
      this.addEnvironment(ENV_QUAKE_TABLE, quakeData.table.tableName);
      quakeData.table.grantReadWriteData(this);
    }

    this.addEnvironment(ENV_QUAKE_TASK_CLUSTER, quakeInfrastructure.cluster.clusterArn);
    this.addEnvironment(ENV_QUAKE_TASK_DEFINITION, quakeTaskDefinition.taskDefinitionArn);
    this.addEnvironment(ENV_QUAKE_TASK_SECURITY_GROUPS, JSON.stringify([quakeInfrastructure.quakeSecurityGroup.securityGroupId]));
    this.addEnvironment(ENV_QUAKE_TASK_SUBNETS, JSON.stringify(quakeInfrastructure.vpc.publicSubnets.map(s => s.subnetId)));
    quakeTaskDefinition.obtainExecutionRole().grantPassRole(this.grantPrincipal);
    quakeTaskDefinition.taskRole.grantPassRole(this.grantPrincipal);

    this.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: [
          'ecs:*',
          'ec2:DescribeNetworkInterfaces',
          'cloudformation:*',
        ],
      }),
    );
  }
}