import * as bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
        where: { email: 'demo@ai-content-os.dev' }
    });
    
    if (!user) {
        console.log("User not found in the DB!");
    } else {
        console.log("User found:", user.email);
        console.log("Hash:", user.passwordHash);
        const valid = await bcrypt.compare("Demo@123456", user.passwordHash || "");
        console.log("Password Valid:", valid);
    }
    
    const count = await prisma.user.count();
    console.log("Total users:", count);
}

main();
