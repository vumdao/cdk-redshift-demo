import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { AmazonLinuxGeneration, AmazonLinuxImage, Instance, InstanceClass, InstanceSize, InstanceType, Port, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EnvironmentConfig } from "./shared/environment";
import { Cluster, ClusterType } from "@aws-cdk/aws-redshift-alpha";
import { Bucket, BucketEncryption, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { readFileSync } from "fs";
import { resolve } from "path";


export class RedshiftDemoStack extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-${reg.stage}-redshift`;

    const s3 = new Bucket(this, `${prefix}-data-ingest`, {
      bucketName: `${prefix}-data-ingest`,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    const role = new Role(this, `${prefix}-role`, {
      roleName: `${prefix}-role`,
      assumedBy: new ServicePrincipal('redshift.amazonaws.com')
    });
    s3.grantRead(role);

    const vpc = new Vpc(this, `${prefix}-vpc`, {
      vpcName: `${prefix}-vpc`,
      maxAzs: 1
    });

    const cluster = new Cluster(this, `${prefix}-cluster-demo`, {
      clusterName: `${prefix}-demo`,
      vpc: vpc,
      masterUser: {
        masterUsername: 'admin'
      },
      numberOfNodes: 2,
      clusterType: ClusterType.MULTI_NODE,
      removalPolicy: RemovalPolicy.DESTROY,
      roles: [role]
    });

    const clusterSg = cluster.connections.securityGroups[0];
    clusterSg.addIngressRule(clusterSg, Port.allTcp(), "Allow internal access Redshift");

    const ec2 = new Instance(this, `${prefix}-psql`, {
      instanceName: `${prefix}-psql`,
      vpc: vpc,
      securityGroup: clusterSg,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
      machineImage: new AmazonLinuxImage({generation: AmazonLinuxGeneration.AMAZON_LINUX_2}),
      role: new Role(this, `${prefix}-ec2-ssm`, {roleName: `${prefix}-ec2-ssm`, assumedBy: new ServicePrincipal('ec2.amazonaws.com'), managedPolicies: [{managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'}]})
    });

    const userData = readFileSync(resolve(__dirname, './user-data.sh'), 'utf8');
    ec2.addUserData(userData);
  }
}