export function formatDateTime(timeStr: string) {
  const [date, time] = timeStr.split("T");

  const currentDate = new Date();
  const lastMessageDate = new Date(date);

  const hour = time.split(".").shift()?.split(":")[0];
  const minute = time.split(".").shift()?.split(":")[1];
  const range = currentDate.getDate() - lastMessageDate.getDate();
  if(range > 0) {
    if(range === 1) return "Kecha";
    return date;
  };

  return `${hour}:${minute}`;
}