# Web Development Assignment - Notice Board

A dynamic, premium Notice Board web application built using Next.js, Prisma, PostgreSQL (Supabase), Tailwind CSS, and Supabase S3-compatible Storage for image uploads.

---

## How to Run the Project Locally

Follow these steps to set up and run the project on your machine:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/santupramanik1/web_development_assignment.git
   cd web_development_assignment
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Copy the sample environment file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in the required variables (your Supabase PostgreSQL URL and S3 connection credentials).

4. **Prisma Setup**:
   - Generate the Prisma client:
     ```bash
     npx prisma generate
     ```
   - Push the schema to the database:
     ```bash
     npx prisma db push
     ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   - Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.




## AI Usage Summary

AI was used to:
- Write the S3 file upload API endpoint (`/api/upload`) using `@aws-sdk/client-s3`.
- Integrate the file upload flow on the notice submission form.
