export async function waitForTermination(
  onShutdown: () => void | Promise<void>,
): Promise<void> {
  await new Promise<void>((resolve) => {
    let hasShutDown = false;

    const handler = async () => {
      if (hasShutDown) {
        return;
      }

      hasShutDown = true;
      process.off("SIGINT", handler);
      process.off("SIGTERM", handler);

      await onShutdown();
      resolve();
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  });
}
