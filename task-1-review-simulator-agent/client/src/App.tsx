import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./pages/layout";
import { Toaster } from "react-hot-toast";
import ReviewPage from "./pages/review-page";
import SimulateReviewResultPage from "./pages/simulate-review-result";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<ReviewPage />} />
      <Route path="simulate-review-result" element={<SimulateReviewResultPage />} />
    </Route>,
  ),
);

const queryClient = new QueryClient();

const App = () => {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </QueryClientProvider>
    </>
  );
};

export default App;
