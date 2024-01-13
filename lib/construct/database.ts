import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface DatabaseProps {
  vpc: ec2.IVpc;
}

export class Database extends Construct {
  readonly cluster: rds.DatabaseCluster;
  readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const vpc = props.vpc;

    // Please read README.md ### Using Postgres section if you want to use Postgres
    // engine = rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_15_2 }),
    const engine = rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_03_0 });
    const cluster = new rds.DatabaseCluster(this, "Cluster", {
      writer: rds.ClusterInstance.provisioned("Writer", {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      engine,
      }),
      vpc,
      vpcSubnets: vpc.selectSubnets({ subnets: vpc.isolatedSubnets.concat(vpc.privateSubnets) }),
      storageEncrypted: true,
      // Exclude some more special characters from password string to avoid from URI encoding issue
      // see: https://www.prisma.io/docs/orm/reference/connection-urls#special-characters
      credentials: rds.Credentials.fromUsername(engine.defaultUsername ?? "admin", {
        excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\,=^",
      }),
    });

    this.cluster = cluster;
    this.secret = cluster.secret!;
  }

  allowInboundAccess(peer: ec2.IPeer) {
    this.cluster.connections.allowDefaultPortFrom(peer);
  }
}
