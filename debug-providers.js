// Debug script to test provider registration
const { GlobalConfig } = require('./dist/state/GlobalConfig.js');
const { ProviderRegistry } = require('./dist/core/providers/ProviderRegistry.js');

async function testProviders() {
    console.log('=== Provider Registration Debug Test ===');
    
    try {
        // Mock VS Code context and secrets
        const mockContext = {
            globalState: {
                get: (key) => undefined,
                update: (key, value) => Promise.resolve()
            }
        };
        
        const mockSecrets = {
            get: (key) => Promise.resolve(undefined),
            store: (key, value) => Promise.resolve(),
            delete: (key) => Promise.resolve()
        };
        
        // Create instances
        const config = new GlobalConfig(mockContext);
        const registry = new ProviderRegistry(config, mockSecrets);
        
        console.log('1. Created registry');
        
        // Initialize providers
        await registry.initializeBuiltinProviders();
        console.log('2. Initialized builtin providers');
        
        // Get providers
        const providers = registry.getProviders();
        console.log('3. Retrieved providers:', providers.length);
        
        // List all providers
        providers.forEach((provider, index) => {
            console.log(`   Provider ${index + 1}: ${provider.id} - ${provider.displayName}`);
        });
        
        // Test Ollama specifically
        const ollamaProvider = registry.getProvider('ollama');
        if (ollamaProvider) {
            console.log('4. ✅ Ollama provider found:', ollamaProvider.displayName);
            
            // Test model fetching (this might fail due to network, but we'll see)
            try {
                console.log('5. Testing Ollama model fetching...');
                const models = await ollamaProvider.getModels();
                console.log(`   ✅ Got ${models.length} models from Ollama`);
                models.slice(0, 3).forEach(model => {
                    console.log(`   - ${model.id}`);
                });
            } catch (error) {
                console.log('   ❌ Model fetching failed:', error.message);
            }
        } else {
            console.log('4. ❌ Ollama provider NOT found');
        }
        
        console.log('=== Test Complete ===');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testProviders().catch(console.error);
