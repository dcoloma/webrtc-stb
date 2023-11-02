let peerConnection;
const config = {
  iceServers: [
      { 
        "urls": "stun:stun.l.google.com:19302",
      },
      // { 
      //   "urls": "turn:TURN_IP?transport=tcp",
      //   "username": "TURN_USERNAME",
      //   "credential": "TURN_CREDENTIALS"
      // }
  ]
};

//const host = window.location.origin;
//const host = "192.168.1.101:4000";
//const host = "https://stb-webrtc.fly.dev";
const host = "https://webrtc-stb.onrender.com";
console.log(host);

const socket = io.connect(host);
const video = document.querySelector("video");

//const enableAudioButton = document.querySelector("#enable-audio");
//enableAudioButton.addEventListener("click", enableAudio)

socket.on("offer", (id, description) => {
  console.log('received offer');
  peerConnection = new RTCPeerConnection(config);
  const isStb = navigator.userAgent.includes("IPTV-23.3.1");
  if (!isStb) {
    peerConnection
    .setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("answer", id, peerConnection.localDescription);
    });
  } else {
    peerConnection
    .setRemoteDescription(new RTCSessionDescription({
			type: description.type,
			sdp: description.sdp
				.split('\n')
				.filter((line) => {
					return line.trim() !== 'a=extmap-allow-mixed';
				})
				.join('\n')
	        })
	      )
    .then(() => peerConnection.createAnswer())
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      console.log('Sending Answer');
      socket.emit("answer", id, peerConnection.localDescription);
    });
  }
  peerConnection.ontrack = event => {
    console.log('ontrack', event.track.enabled);
    console.log('ontrack', event.track.kind);

    video.srcObject = event.streams[0];
  };
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };
});


socket.on("candidate", (id, candidate) => {
  console.log('received ice candidate');
  peerConnection
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch(e => console.error(e));
});

socket.on("connect", () => {
  console.log('received connect');
  socket.emit("watcher");
});

socket.on("broadcaster", () => {
  console.log('received broadcaster');
  socket.emit("watcher");
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
  peerConnection.close();
};

function enableAudio() {
  console.log("Enabling audio")
  video.muted = false;
}
