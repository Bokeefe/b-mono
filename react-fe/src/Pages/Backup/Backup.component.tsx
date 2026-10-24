import { useEffect, useState } from "react";
import miniB from "../../assets/performa.webp";
import "./Backup.scss";

function Backup() {
  const [password, setPassword] = useState<string>("");
  useEffect(() => {
    setPassword;
    const tempPass = prompt("Enter the backup password:");
    setPassword(tempPass || "");
    console.log(tempPass);
  }, []);

  return <></>;
}

export default Backup;
