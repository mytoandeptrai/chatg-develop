import React from 'react';
import { v1 as uuid } from 'uuid';
import { useHistory } from 'react-router-dom';
const AnotherApp = () => {
    const history = useHistory();

    const createRoom = () => {
        const id = uuid();
        history.push(`/room/${id}`);
    };

    return <button onClick={createRoom}>Create Room</button>;
};

export default AnotherApp;
