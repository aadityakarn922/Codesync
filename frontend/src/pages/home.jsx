import { useState} from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://codesync-pkuf.onrender.com";

function Home()
{
    const[roomId,setRoomId]=useState("");
    const joinRoom=async () => {
        if(!roomId) return;
        try{
            await axios.post(`${API_URL}/room`,{
              roomId,
            })
            window.location.href=`/editor/${roomId}`
        }
        catch(err)
        {
            console.log("error joining room",err)
        }
        
    }
    return (
        <div>
            <h1>real-time code editor</h1>
            <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <button onClick={joinRoom}>
        Join Room
      </button>
    </div>
  );
        
    
}
export default Home;