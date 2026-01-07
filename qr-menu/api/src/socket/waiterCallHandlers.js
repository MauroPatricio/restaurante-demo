// Socket.IO event handlers for waiter calls

export const setupWaiterCallHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Join restaurant room
        socket.on('join:restaurant', ({ restaurantId }) => {
            if (!restaurantId) {
                console.error('No restaurantId provided');
                return;
            }

            const roomName = `restaurant:${restaurantId}`;
            socket.join(roomName);
            console.log(`Socket ${socket.id} joined room: ${roomName}`);

            socket.emit('joined:restaurant', {
                restaurantId,
                message: 'Successfully joined restaurant room'
            });
        });

        // Leave restaurant room
        socket.on('leave:restaurant', ({ restaurantId }) => {
            if (!restaurantId) {
                return;
            }

            const roomName = `restaurant:${restaurantId}`;
            socket.leave(roomName);
            console.log(`Socket ${socket.id} left room: ${roomName}`);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
};

// Helper to emit waiter call event
export const emitWaiterCall = (io, restaurantId, payload) => {
    io.to(`restaurant:${restaurantId}`).emit('waiter:call', payload);
};

// Helper to emit call acknowledged event
export const emitCallAcknowledged = (io, restaurantId, payload) => {
    io.to(`restaurant:${restaurantId}`).emit('waiter:call:acknowledged', payload);
};

// Helper to emit call resolved event
export const emitCallResolved = (io, restaurantId, payload) => {
    io.to(`restaurant:${restaurantId}`).emit('waiter:call:resolved', payload);
};

// Helper to emit client reaction event
export const emitClientReaction = (io, restaurantId, payload) => {
    io.to(`restaurant:${restaurantId}`).emit('client:reaction', payload);
};
