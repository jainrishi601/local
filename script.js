let room_id;
let localStream;
let screenStream;
let peer = null;
let connections = {};
let screenSharing = false;

const getUserMedia = navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function createRoom() {
    const roomInput = document.getElementById("room-input").value.trim();
    if (!roomInput) {
        alert("Please enter a room number");
        return;
    }
    room_id = roomInput;

    peer = new Peer(room_id);
    peer.on('open', (id) => {
        console.log("Room created with ID:", id);
        notify("Waiting for students to join...");
        startLocalStream();
    });

    peer.on('call', (call) => {
        // Answer each incoming call with the teacher's local stream
        call.answer(localStream);
        call.on('stream', (remoteStream) => setRemoteStream(remoteStream, call.peer));
        connections[call.peer] = call; // Track each connection
    });

    peer.on('error', (err) => {
        console.error("Peer error:", err);
        notify("Error: " + err.message);
    });
}

function joinRoom() {
    const roomInput = document.getElementById("room-input").value.trim();
    if (!roomInput) {
        alert("Please enter a room number");
        return;
    }
    room_id = roomInput;

    peer = new Peer();
    peer.on('open', (id) => {
        console.log("Joining room with ID:", id);
        notify("Connecting to teacher...");
        const call = peer.call(room_id, new MediaStream());
        call.on('stream', (remoteStream) => setRemoteStream(remoteStream, call.peer));
        connections[call.peer] = call;
    });

    peer.on('error', (err) => {
        console.error("Peer error:", err);
        notify("Error: " + err.message);
    });
}

function startLocalStream() {
    getUserMedia({ video: true, audio: true })
        .then((stream) => {
            localStream = stream;
            setLocalStream(localStream);
        })
        .catch((err) => console.error("Failed to get local stream:", err));
}

function setLocalStream(stream) {
    document.getElementById("local-vid-container").hidden = false;
    const video = document.getElementById("local-video");
    video.srcObject = stream;
    video.muted = true;
    video.play();
}

function setRemoteStream(stream, peerId) {
    const remoteContainer = document.getElementById("remote-vid-container");
    if (!remoteContainer.querySelector(`#remote-video-${peerId}`)) {
        const video = document.createElement("video");
        video.id = `remote-video-${peerId}`;
        video.srcObject = stream;
        video.autoplay = true;
        remoteContainer.appendChild(video);
        remoteContainer.hidden = false;
    }
}

function startScreenShare() {
    if (screenSharing) {
        stopScreenSharing();
        return;
    }

    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then((stream) => {
            screenStream = stream;
            setScreenSharingStream(stream);
            screenSharing = true;

            const screenTrack = screenStream.getVideoTracks()[0];
            screenTrack.onended = () => stopScreenSharing();

            for (let peerId in connections) {
                const sender = connections[peerId].peerConnection.getSenders().find(s => s.track.kind === screenTrack.kind);
                if (sender) sender.replaceTrack(screenTrack);
            }
        })
        .catch((err) => console.error("Error sharing screen:", err));
}

function stopScreenSharing() {
    if (!screenSharing) return;
    screenSharing = false;

    const videoTrack = localStream.getVideoTracks()[0];
    for (let peerId in connections) {
        const sender = connections[peerId].peerConnection.getSenders().find(s => s.track.kind === videoTrack.kind);
        if (sender) sender.replaceTrack(videoTrack);
    }

    screenStream.getTracks().forEach(track => track.stop());
}

function setScreenSharingStream(stream) {
    document.getElementById("screenshare-container").hidden = false;
    const video = document.getElementById("screenshared-video");
    video.srcObject = stream;
    video.muted = true;
    video.play();
}

function notify(msg) {
    const notification = document.getElementById("notification");
    notification.innerHTML = msg;
    notification.hidden = false;
    setTimeout(() => notification.hidden = true, 3000);
}
