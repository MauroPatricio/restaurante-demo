import React, { useState } from 'react';

export default function App() {
    const [count, setCount] = useState(0);
    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h1>Minimal App Working</h1>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
