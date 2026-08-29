const canonicalOrigin = "https://acadianawebdesign.com";
const redirectOrigin = "https://www.acadianawebdesign.com";
const timeoutMs = 15_000;

async function request(path, options = {}) {
  const response = await fetch(`${options.origin ?? canonicalOrigin}${path}`, {
    redirect: options.redirect ?? "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (options.statuses && !options.statuses.includes(response.status)) {
    throw new Error(
      `${path} returned ${response.status}; expected ${options.statuses.join(" or ")}`,
    );
  }

  return response;
}

async function expectText(path, expectedText) {
  const response = await request(path, { statuses: [200] });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${path} returned unexpected content type ${contentType}`);
  }

  const body = await response.text();
  if (!body.includes(expectedText)) {
    throw new Error(`${path} did not contain ${JSON.stringify(expectedText)}`);
  }
}

await expectText("/", "Acadiana Web Design");
await expectText("/legal/privacy", "Privacy Policy");

const redirectPath = "/legal/privacy?source=production-smoke";
const redirectResponse = await request(redirectPath, {
  origin: redirectOrigin,
  redirect: "manual",
  statuses: [307, 308],
});
const expectedLocation = `${canonicalOrigin}${redirectPath}`;
if (redirectResponse.headers.get("location") !== expectedLocation) {
  throw new Error(
    `www redirect was ${redirectResponse.headers.get("location")}; expected ${expectedLocation}`,
  );
}

const imageResponse = await request("/opengraph-image.png", {
  statuses: [200],
});
if (imageResponse.headers.get("content-type") !== "image/png") {
  throw new Error("Open Graph image did not return image/png");
}

const adminResponse = await request("/admin", {
  redirect: "manual",
  statuses: [307, 308],
});
if (adminResponse.headers.get("location") !== "/") {
  throw new Error(
    "Unauthenticated admin request did not redirect to the homepage",
  );
}

console.log(
  `Production smoke passed: ${canonicalOrigin}, www redirect, privacy, Open Graph image, admin gate.`,
);
