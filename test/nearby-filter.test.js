import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesNearbyRole} from '../mobile/nearby-filter.js';
test('Nearby role filter selects only roles in the already eligible result without mutating it',()=>{
 const people=[{userId:'founder',roles:['Founder','Developer']},{userId:'researcher',roles:['Security Researcher']},{userId:'investor',roles:['Investor']}];
 assert.deepEqual(people.filter(p=>matchesNearbyRole(p,'Founder')).map(p=>p.userId),['founder']);
 assert.equal(people.filter(p=>matchesNearbyRole(p)).length,3);
 assert.equal(people.filter(p=>matchesNearbyRole(p,'Developer')).length,1);
 assert.equal(people.filter(p=>matchesNearbyRole(p,'Recruiter')).length,0);
 assert.equal(matchesNearbyRole(null,'All'),false);assert.equal(matchesNearbyRole({},'All'),false);
 assert.equal(matchesNearbyRole({userId:'bad',roles:'Founder'},'Founder'),false);
 assert.deepEqual(people[0].roles,['Founder','Developer']);
});
