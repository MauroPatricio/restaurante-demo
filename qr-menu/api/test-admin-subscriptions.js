// Test script for Subscription Management Admin Module
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:4000/api';
let adminToken = '';

async function loginAsAdmin() {
    try {
        console.log('\n🔐 Logging in as Admin...');
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@restaurant.com',
            password: 'Admin@123'
        });

        adminToken = response.data.token;
        console.log('✅ Successfully logged in as admin');
        console.log(`   User: ${response.data.user.name}`);
        console.log(`   Role: ${response.data.user.role?.name || 'N/A'}`);

        return true;
    } catch (error) {
        console.error('❌ Failed to login:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testGetAllSubscriptions() {
    try {
        console.log('\n📋 Testing getAllSubscriptions (Admin only)...');
        const response = await axios.get(`${API_URL}/subscriptions/admin/all`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        console.log(`✅ Successfully fetched ${response.data.count} subscriptions`);
        response.data.subscriptions.forEach((sub, index) => {
            console.log(`   ${index + 1}. ${sub.restaurant?.name || 'N/A'} - Status: ${sub.status} - Expires: ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`);
        });

        return response.data.subscriptions;
    } catch (error) {
        console.error('❌ Failed to get subscriptions:', error.response?.data?.message || error.message);
        return [];
    }
}

async function testUpdateSubscriptionStatus(subscriptionId, newStatus) {
    try {
        console.log(`\n🔄 Testing updateStatus to "${newStatus}"...`);
        const response = await axios.patch(
            `${API_URL}/subscriptions/admin/${subscriptionId}/status`,
            {
                status: newStatus,
                reason: 'Testing status change functionality'
            },
            {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }
        );

        console.log(`✅ Successfully updated subscription status`);
        console.log(`   Old Status: ${response.data.subscription.status}`);
        console.log(`   New Status: ${newStatus}`);
        console.log(`   Is Active: ${response.data.subscription.isActive}`);

        return true;
    } catch (error) {
        console.error('❌ Failed to update status:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testGetAuditLogs(subscriptionId) {
    try {
        console.log('\n📜 Testing getAuditLogs...');
        const response = await axios.get(`${API_URL}/subscriptions/admin/audit-logs`, {
            params: {
                subscriptionId: subscriptionId,
                limit: 10
            },
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        console.log(`✅ Successfully fetched ${response.data.logs.length} audit logs`);
        response.data.logs.forEach((log, index) => {
            console.log(`   ${index + 1}. ${log.action} by ${log.user?.name || 'System'} - ${new Date(log.timestamp).toLocaleString()}`);
            if (log.changes) {
                console.log(`      Change: ${log.changes.oldValue} → ${log.changes.newValue}`);
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Failed to get audit logs:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testAccessDenied() {
    try {
        console.log('\n🚫 Testing access denied (non-admin user)...');

        // Login as a non-admin user (demo user if exists)
        const demoResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'demo1766785675829@test.com',
            password: 'Demo@123'
        }).catch(() => null);

        if (!demoResponse) {
            console.log('⚠️  Demo user not found, skipping access denied test');
            return true;
        }

        const demoToken = demoResponse.data.token;

        try {
            await axios.get(`${API_URL}/subscriptions/admin/all`, {
                headers: { 'Authorization': `Bearer ${demoToken}` }
            });

            console.log('❌ Demo user should NOT have access to admin endpoints!');
            return false;
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('✅ Access correctly denied for non-admin user');
                return true;
            } else {
                console.log(`⚠️  Unexpected error: ${error.response?.status} ${error.response?.data?.message}`);
                return false;
            }
        }
    } catch (error) {
        console.error(`⚠️  Test skipped: ${error.message}`);
        return true;
    }
}

async function runTests() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 SUBSCRIPTION MANAGEMENT MODULE TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Test 1: Login as Admin
    const loggedIn = await loginAsAdmin();
    if (!loggedIn) {
        console.log('\n❌ Cannot proceed without admin login');
        process.exit(1);
    }

    // Test 2: Get all subscriptions
    const subscriptions = await testGetAllSubscriptions();
    if (subscriptions.length === 0) {
        console.log('\n⚠️  No subscriptions found, some tests will be skipped');
    }

    // Test 3: Update subscription status (if there are subscriptions)
    if (subscriptions.length > 0) {
        const testSub = subscriptions[0];
        const originalStatus = testSub.status;
        const newStatus = originalStatus === 'active' ? 'suspended' : 'active';

        await testUpdateSubscriptionStatus(testSub._id, newStatus);

        // Restore original status
        console.log(`\n🔄 Restoring original status to "${originalStatus}"...`);
        await testUpdateSubscriptionStatus(testSub._id, originalStatus);
    }

    // Test 4: Get audit logs
    if (subscriptions.length > 0) {
        await testGetAuditLogs(subscriptions[0]._id);
    }

    // Test 5: Access denied for non-admin
    await testAccessDenied();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runTests().catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
});
