import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "@/components";
import { ChatRoom, EmptyRoom } from "./pages";
import { setCurrentUserInfo } from "./store/slices/chatInfoSlice";
import { useAppDispatch } from "./store/hooks/hooks";
import { ToastContainer } from "react-toastify";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
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
        console.log(event.data)
        dispatch(setCurrentUserInfo(event.data.currentUserInfo));
      }
    };

    window.addEventListener("message", handleMessage);

    

  return (
    <>
      <RouterProvider router={routes} />
      <ToastContainer />
    </>
  );
};

export default App;
