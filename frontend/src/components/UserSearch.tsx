import React, { useState } from "react";


type User = {
	id: number;
	username: string;
}

interface UserSearchProps {
    onSelectUser?: (user: User) => void;
}

// export const UserSearch: React.FC<UserSearchProps> = ({ onSelectUser }) => {
//     const [query, setQuery] = useState("");
//     const [results, setResults] = useState<User[]>([]);

//     const handleSearch = async (text: string) => {
//         setQuery(text);
        
//     };

// }