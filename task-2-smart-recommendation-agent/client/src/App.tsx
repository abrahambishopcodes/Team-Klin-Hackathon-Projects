import {createBrowserRouter, createRoutesFromElements, Route, RouterProvider} from "react-router-dom"
import Layout from "./pages/layout"
import AiChatPage from "./pages/ai-chat"
import {Toaster} from 'react-hot-toast'


const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} >
      <Route index element={<AiChatPage />} />
    </Route>
  )
)

const App = () => {
  return (
    <>
    <RouterProvider router={router} />
    <Toaster position="top-center" />
    </>
  )
}

export default App