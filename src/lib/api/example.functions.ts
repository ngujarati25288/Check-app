export interface GetGreetingInput {
  name: string;
}

export async function getGreeting({ data }: { data: GetGreetingInput }) {
  return {
    greeting: `Hello, ${data.name}!`,
    mode: "client",
  };
}
