public class k6_1 {
import http from 'k6/http';
import { sleep } from 'k6';

    export let options = {
        vus: 10, // 10 virtual users
                duration: '30s', // Test duration of 30 seconds
    };

    export default function () {
        http.get('https://test.k6.io'); // Example test URL
        sleep(1);
    }

}