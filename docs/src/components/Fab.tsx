export const Fab = () => {
  return (
    <button
      type="button"
      className="mx-[4px] inline-flex size-[40px] items-center transform-[translateY(5px)] justify-center rounded-full border-none bg-[#1e88e5] text-[#ffffff] shadow-md transition-colors hover:bg-[#2196f3] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#64b5f6]/50 active:bg-[#1976d2] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#90caf9] dark:text-[#212121] dark:hover:bg-[#64b5f6] dark:active:bg-[#bbdefb]"
    >
      <svg
        className="pointer-events-none select-none size-[24px]"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
