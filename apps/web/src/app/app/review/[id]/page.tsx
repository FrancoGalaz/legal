// Server component — provides static params for static export (GitHub Pages)
import ReviewClient from "./review-client";

export function generateStaticParams() {
  return [{ id: "demo" }];
}

export default function ReviewPage() {
  return <ReviewClient />;
}
