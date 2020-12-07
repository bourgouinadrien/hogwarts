<?php

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        $user_email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');
        if (is_null($password)) {
            throw new InvalidArgumentException("Please fill the ADMIN_PASSWORD env variable");
        }

        User::firstOrcreate(['email' => 'admin@epitech.eu',], [
            'name' => 'admin',
            'email' => $user_email,
            'password' => Hash::make($password),
            'api_token' => str_random(32),
            'admin' => true
        ]);
    }
}
