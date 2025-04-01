import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter, Gauge, Rate } from 'k6/metrics';

// Custom metrics
export let responseTime = new Trend('response_time');
export let successCount = new Counter('success_count');
export let failureCount = new Counter('failure_count');
export let activeUsers = new Gauge('active_users');
export let errorRate = new Rate('error_rate');

export let options = {
  stages: [
    { duration: '20s', target: 30 }, // Ramp-up to 30 users
    { duration: '60s', target: 100 }, // Peak load at 100 users
    { duration: '20s', target: 30 }, // Ramp-down to 30 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be < 500ms
    'error_rate': ['rate<0.05'], // Less than 5% errors allowed
    'success_count': ['count>100'], // At least 100 successful requests in total
  },
  setupTimeout: '1m', // Set up test environment timeout
};

export function setup() {
  console.log('Test setup: Creating user session...');
  // Setup logic, e.g., creating users or initializing data, can be added here.
  // This could be a token or user login, etc.
  let res = http.post('https://jsonplaceholder.typicode.com/login', { username: 'test', password: 'password' });
  let token = res.json('token');
  return { token };  // Return the token to be used in the main test
}

export default function (data) {
  // Access the token from setup
  let token = data.token;
  let headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  group('GET Posts', function() {
    let res = http.get('https://jsonplaceholder.typicode.com/posts', { headers });
    check(res, { 'status is 200': (r) => r.status === 200 });
    responseTime.add(res.timings.duration);
    successCount.add(1);

    // Error handling and retries
    if (res.status !== 200) {
      failureCount.add(1);
      errorRate.add(1);
      console.error('Failed GET request for Posts');
    }
  });

  group('POST Comment', function() {
    let payload = JSON.stringify({ postId: 1, name: 'Test Comment', email: 'test@example.com', body: 'This is a test comment.' });
    let res = http.post('https://jsonplaceholder.typicode.com/comments', payload, { headers });

    check(res, { 'status is 201': (r) => r.status === 201 });
    responseTime.add(res.timings.duration);
    successCount.add(1);

    // Error handling and retries
    if (res.status !== 201) {
      failureCount.add(1);
      errorRate.add(1);
      console.error('Failed POST request for Comment');
    }
  });

  group('PUT Post', function() {
    let payload = JSON.stringify({ title: 'Updated Post', body: 'Updated content', userId: 1 });
    let res = http.put('https://jsonplaceholder.typicode.com/posts/1', payload, { headers });

    check(res, { 'status is 200': (r) => r.status === 200 });
    responseTime.add(res.timings.duration);
    successCount.add(1);

    if (res.status !== 200) {
      failureCount.add(1);
      errorRate.add(1);
      console.error('Failed PUT request for Post');
    }
  });

  group('DELETE Post', function() {
    let res = http.del('https://jsonplaceholder.typicode.com/posts/1', null, { headers });

    check(res, { 'status is 200': (r) => r.status === 200 });
    responseTime.add(res.timings.duration);
    successCount.add(1);

    if (res.status !== 200) {
      failureCount.add(1);
      errorRate.add(1);
      console.error('Failed DELETE request for Post');
    }
  });

  activeUsers.add(1);  // Track active users
  sleep(1);  // Simulate user think time
}

export function teardown(data) {
  console.log('Test teardown: Cleaning up...');
  // Clean up logic, e.g., log out the user or clean test data.
  let res = http.post('https://jsonplaceholder.typicode.com/logout', { token: data.token });
  if (res.status !== 200) {
    console.error('Teardown failed');
  }
}
