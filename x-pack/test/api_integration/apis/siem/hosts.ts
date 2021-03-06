/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  Direction,
  GetHostDetailsQuery,
  GetHostFirstLastSeenQuery,
  GetHostsTableQuery,
  HostsFields,
} from '../../../../plugins/siem/public/graphql/types';
import { HostDetailsQuery } from './../../../../plugins/siem/public/containers/hosts/details/host_details.gql_query';
import { HostFirstLastSeenGqlQuery } from './../../../../plugins/siem/public/containers/hosts/first_last_seen/first_last_seen.gql_query';
import { HostsTableQuery } from './../../../../plugins/siem/public/containers/hosts/hosts_table.gql_query';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'Ubuntu';
const TOTAL_COUNT = 7;
const EDGE_LENGTH = 1;
const CURSOR_ID = '2ab45fc1c41e4c84bbd02202a7e5761f';

const hostsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

  describe('hosts', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Hosts Table data', () => {
      return client
        .query<GetHostsTableQuery.Query>({
          query: HostsTableQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            sort: {
              field: HostsFields.lastSeen,
              direction: Direction.asc,
            },
            pagination: {
              limit: 1,
              cursor: null,
            },
          },
        })
        .then(resp => {
          const hosts = resp.data.source.Hosts;
          expect(hosts.edges.length).to.be(EDGE_LENGTH);
          expect(hosts.totalCount).to.be(TOTAL_COUNT);
          expect(hosts.pageInfo.endCursor!.value).to.equal('1');
        });
    });

    it('Make sure that pagination is working in Hosts Table query', () => {
      return client
        .query<GetHostsTableQuery.Query>({
          query: HostsTableQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            sort: {
              field: HostsFields.lastSeen,
              direction: Direction.asc,
            },
            pagination: {
              limit: 2,
              cursor: '1',
            },
          },
        })
        .then(resp => {
          const hosts = resp.data.source.Hosts;

          expect(hosts.edges.length).to.be(EDGE_LENGTH);
          expect(hosts.totalCount).to.be(TOTAL_COUNT);
          expect(hosts.edges[0]!.node.host!.os!.name).to.eql(HOST_NAME);
        });
    });

    it('Make sure that we get Host Details data', () => {
      const expectedHost: GetHostDetailsQuery.Host = {
        architecture: 'x86_64',
        id: CURSOR_ID,
        ip: [],
        mac: [],
        name: 'zeek-sensor-san-francisco',
        os: {
          family: 'debian',
          name: HOST_NAME,
          platform: 'ubuntu',
          version: '18.04.2 LTS (Bionic Beaver)',
          __typename: 'OsFields',
        },
        type: null,
        __typename: 'HostFields',
      };

      return client
        .query<GetHostDetailsQuery.Query>({
          query: HostDetailsQuery,
          variables: {
            sourceId: 'default',
            hostName: 'zeek-sensor-san-francisco',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
          },
        })
        .then(resp => {
          const hosts = resp.data.source.HostDetails;
          expect(hosts.host).to.eql(expectedHost);
        });
    });

    it('Make sure that we get Last First Seen for a Host', () => {
      return client
        .query<GetHostFirstLastSeenQuery.Query>({
          query: HostFirstLastSeenGqlQuery,
          variables: {
            sourceId: 'default',
            hostName: 'zeek-sensor-san-francisco',
          },
        })
        .then(resp => {
          const firstLastSeenHost = resp.data.source.HostFirstLastSeen;
          expect(firstLastSeenHost).to.eql({
            __typename: 'FirstLastSeenHost',
            firstSeen: '2019-02-19T19:36:23.561Z',
            lastSeen: '2019-02-19T20:42:33.561Z',
          });
        });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default hostsTests;
