import * as aws_ec2 from 'aws-cdk-lib/aws-ec2';
import * as aws_ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export class QuakeInfrastructure extends Construct {
  public readonly vpc: aws_ec2.Vpc;
  public readonly cluster: aws_ecs.Cluster;
  public readonly quakeSecurityGroup: aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new aws_ec2.Vpc(this, 'Vpc', {
      subnetConfiguration: [
        {
          name: 'games',
          subnetType: aws_ec2.SubnetType.PUBLIC,
          cidrMask: 20,
        },
      ],
    });

    this.quakeSecurityGroup = new aws_ec2.SecurityGroup(this, 'QuakeSecurityGroup', {
      vpc: this.vpc,
    });
    this.quakeSecurityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.allTcp());

    this.cluster = new aws_ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc,
      enableFargateCapacityProviders: true,
    });
  }
}