import AWS from 'aws-sdk';
import {
  ENV_QUAKE_TASK_CLUSTER,
  ENV_QUAKE_TASK_DEFINITION,
  ENV_QUAKE_TASK_SECURITY_GROUPS,
  ENV_QUAKE_TASK_SUBNETS,
} from '../constants';

export class QuakeTasks {
  private readonly ecsSdk: AWS.ECS;
  private readonly cluster: string;
  private readonly taskDefinition: string;
  private readonly securityGroups: string[];
  private readonly subnets: string[];
  private readonly ec2Sdk: AWS.EC2;
  private readonly cloudControlSdk: AWS.CloudControl;

  constructor() {
    this.ecsSdk = new AWS.ECS();
    this.ec2Sdk = new AWS.EC2();
    this.cloudControlSdk = new AWS.CloudControl();
    this.cluster = process.env[ENV_QUAKE_TASK_CLUSTER]!;
    this.taskDefinition = process.env[ENV_QUAKE_TASK_DEFINITION]!;
    this.securityGroups = JSON.parse(process.env[ENV_QUAKE_TASK_SECURITY_GROUPS]!);
    this.subnets = JSON.parse(process.env[ENV_QUAKE_TASK_SUBNETS]!);
  }

  async run(_name: string): Promise<RunQuakeTaskInfo> {
    const res = await this.cloudControlSdk.createResource({
      TypeName: AWS_ECS_SERVICE,
      DesiredState: JSON.stringify({
        Cluster: this.cluster,
        TaskDefinition: this.taskDefinition,
        DesiredCount: 1,
        LaunchType: 'FARGATE',
        NetworkConfiguration: {
          AwsvpcConfiguration: {
            AssignPublicIp: 'ENABLED',
            SecurityGroups: this.securityGroups,
            Subnets: this.subnets,
          },
        },
      }),
    }).promise();

    if (!res.ProgressEvent?.RequestToken) {
      throw new Error('No request token!');
    }

    return {
      requestToken: res.ProgressEvent?.RequestToken,
      identifier: res.ProgressEvent?.Identifier,
    };
  }

  async describe(info: RunQuakeTaskInfo): Promise<DescribeQuakeTaskResult> {
    console.log('Describing', info);

    const identifier = await this.findIdentifier(info);
    const task = identifier ? await this.findTaskByIdentifier(identifier) : undefined;
    const publicIp = task && task.taskArn ? await this.findTaskPublicIp(task) : undefined;

    return {
      status: task?.lastStatus ?? 'UNKNOWN',
      publicIp,
    };
  }

  private async findTaskByIdentifier(identifier: string) {
    const getResourceResponse = await this.cloudControlSdk.getResource({
      TypeName: AWS_ECS_SERVICE,
      Identifier: identifier,
    }).promise();

    const propertiesEncoded = getResourceResponse.ResourceDescription?.Properties;
    const properties = propertiesEncoded ? JSON.parse(propertiesEncoded) : undefined;
    const serviceName = properties.ServiceName;
    if (!serviceName) {
      throw new Error('Could not find service name');
    }

    const tasks = await this.ecsSdk.listTasks({
      cluster: this.cluster,
      serviceName: serviceName,
    }).promise();

    if (!tasks.taskArns || tasks.taskArns.length === 0) {
      return;
    }

    const describeTasksResult = await this.ecsSdk.describeTasks({
      cluster: this.cluster,
      tasks: tasks.taskArns,
    }).promise();

    if (!describeTasksResult.tasks || describeTasksResult.tasks.length === 0) {
      return;
    }

    return describeTasksResult.tasks[0];
  }

  private async findTaskPublicIp(task: AWS.ECS.Task) {
    const eni = task.attachments?.find(attachment => attachment.type === 'ElasticNetworkInterface');
    const eniId = eni?.details?.find(detail => detail.name === 'networkInterfaceId')?.value;
    if (!eniId) return;

    const eniRes = await this.ec2Sdk.describeNetworkInterfaces({
      NetworkInterfaceIds: [eniId],
    }).promise();

    if (!eniRes.NetworkInterfaces || eniRes.NetworkInterfaces.length === 0) {
      return;
    }

    const [nic] = eniRes.NetworkInterfaces;
    return nic.Association?.PublicIp;
  }

  private async findIdentifier(info_: RunQuakeTaskInfo) {
    if (info_.identifier) {
      return info_.identifier;
    }

    if (!info_.requestToken) {
      return undefined;
    }

    const getResourceRequest = await this.cloudControlSdk.getResourceRequestStatus({
      RequestToken: info_.requestToken,
    }).promise();

    return getResourceRequest.ProgressEvent?.Identifier;
  }

  async stop(info: RunQuakeTaskInfo) {
    const identifier = info.identifier
      ? info.identifier
      : await this.findIdentifier(info);

    if (!identifier) {
      throw new Error('Could not find identifier');
    }

    await this.cloudControlSdk.deleteResource({
      TypeName: AWS_ECS_SERVICE,
      Identifier: identifier,
    }).promise();
  }
}

export interface RunQuakeTaskInfo {
  readonly requestToken: string;
  readonly identifier?: string;
}

export interface DescribeQuakeTaskResult {
  readonly status: string;
  readonly publicIp?: string;
}

const AWS_ECS_SERVICE = 'AWS::ECS::Service';