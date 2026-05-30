import React, { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "@/components";
import { ChatRoom, EmptyRoom } from "./pages";

const App: React.FC = () => {
  const routes = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "",
          element: <EmptyRoom />
        },
        {
          path: "room/:room_id",
          element: <ChatRoom />,
        },
      ],
    },
  ]);

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "AUTH_TOKEN") {
        localStorage.setItem(
          "unify_chat_token",
          event.data.token
        );
      }
    };

    window.addEventListener("message", handleMessage);

    

  return (
    <>
      <RouterProvider router={routes} />
    </>
  );
};

export default App;
