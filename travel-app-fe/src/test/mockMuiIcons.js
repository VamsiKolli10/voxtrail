import React from "react";

// JSX-less mock to avoid Rollup parsing issues in tests.
const MockIcon = (props = {}) => {
  const { children, ...rest } = props;
  return React.createElement(
    "span",
    { "data-testid": rest["data-testid"] || "mock-icon", ...rest },
    children
  );
};

// Export a default for subpath imports like "@mui/icons-material/ArrowBack".
export default MockIcon;

// Named exports for icons imported from the package root.
export const AccessTime = MockIcon;
export const Add = MockIcon;
export const AirplanemodeActive = MockIcon;
export const ArrowBack = MockIcon;
export const AttachMoney = MockIcon;
export const Autorenew = MockIcon;
export const AutoFixHigh = MockIcon;
export const Bookmark = MockIcon;
export const BookmarkBorder = MockIcon;
export const Book = MockIcon;
export const Brightness2 = MockIcon;
export const Brightness4 = MockIcon;
export const Brightness7 = MockIcon;
export const CheckCircle = MockIcon;
export const ChevronLeft = MockIcon;
export const ChevronRight = MockIcon;
export const ContentCopy = MockIcon;
export const Dashboard = MockIcon;
export const DeleteSweep = MockIcon;
export const DirectionsWalk = MockIcon;
export const Email = MockIcon;
export const EmojiEvents = MockIcon;
export const Explore = MockIcon;
export const ExpandMore = MockIcon;
export const Favorite = MockIcon;
export const FavoriteBorder = MockIcon;
export const FilterList = MockIcon;
export const Groups = MockIcon;
export const Home = MockIcon;
export const Hotel = MockIcon;
export const Insights = MockIcon;
export const Language = MockIcon;
export const Launch = MockIcon;
export const LocalActivity = MockIcon;
export const LocalOffer = MockIcon;
export const LocalPhone = MockIcon;
export const LocationOn = MockIcon;
export const Lock = MockIcon;
export const Map = MockIcon;
export const Mic = MockIcon;
export const MicOff = MockIcon;
export const MyLocation = MockIcon;
export const Navigation = MockIcon;
export const Pause = MockIcon;
export const Phone = MockIcon;
export const PlayArrow = MockIcon;
export const Public = MockIcon;
export const Refresh = MockIcon;
export const RefreshRounded = MockIcon;
export const Search = MockIcon;
export const Security = MockIcon;
export const Share = MockIcon;
export const ShieldMoon = MockIcon;
export const Star = MockIcon;
export const Stop = MockIcon;
export const SwapHoriz = MockIcon;
export const Translate = MockIcon;
export const TravelExplore = MockIcon;
export const ViewList = MockIcon;
export const ViewWeek = MockIcon;
export const Visibility = MockIcon;
export const VisibilityOff = MockIcon;
export const VolumeUp = MockIcon;
export const AccountBalance = MockIcon;
export const Emergency = MockIcon;
export const MoreHoriz = MockIcon;
export const ErrorOutline = MockIcon;
