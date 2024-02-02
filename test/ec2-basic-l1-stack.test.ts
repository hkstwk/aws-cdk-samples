import * as cdk from 'aws-cdk-lib';
import {Template} from "aws-cdk-lib/assertions";
import {Ec2BasicL1Stack} from "../lib/ec2-basic-l1-stack";

let app: cdk.App, stack: Ec2BasicL1Stack, template: Template;

beforeAll(() => {
    app = new cdk.App();
    stack = new Ec2BasicL1Stack(app, 'Ec2BasicL1TestStack', {
        env: {
            account: '123456789012',
            region: 'eu-west-2'
        }
    });
    template = Template.fromStack(stack);
    console.dir(template, {depth: null});
});

describe('Resource count tests', () => {
    it('should have one SecurityGroup ', () => {
        template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    })
    it('should have one EC2 Instance ', () => {
        template.resourceCountIs('AWS::EC2::Instance', 1);
    })
})

describe('SecurityGroup tests', () => {
    it('should have correct groupname', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {GroupName: 'ec2-basic-sg-l1'})
    });
    it('should have correct outbound rules', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupEgress: [{
                CidrIp: '0.0.0.0/0',
                IpProtocol: '-1'
            }]
        })
    });
})

    describe('Ec2Instance tests', () => {
        it('should have correct array of security groups', () => {
            template.hasResourceProperties('AWS::EC2::Instance', {SecurityGroupIds: [{'Fn::GetAtt': ['ec2basicsgl165B85E91', 'GroupId']}]});
        })
        it('should have correct instance type', () => {
            template.hasResourceProperties('AWS::EC2::Instance', {InstanceType: "t2.micro"})
        })
        it('should have correct PrivateDnsNameOptions', () => {
            template.hasResourceProperties('AWS::EC2::Instance', {
                PrivateDnsNameOptions: {
                    HostnameType: 'ip-name',
                    EnableResourceNameDnsARecord: true,
                    EnableResourceNameDnsAAAARecord: false
                }
            })
        })
    })

    describe("Ec2BasicL1Stack", () => {
        test("matches the snapshot", () => {
            expect(template.toJSON()).toMatchSnapshot();
        });
    });
