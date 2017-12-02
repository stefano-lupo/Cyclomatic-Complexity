# Distributed Cyclomatic Complexity Calculator

## Results
Repo used: [mljs/feedforward-neural-networks](https://github.com/mljs/feedforward-neural-networks)

- 1 Worker (1 Desktop): 21.684s
- 2 Workers (2 Desktop): 12.293s
- 3 Workers (3 Desktop): 9.6s
- 4 Workers (4 Desktop): 8.955s
- 5 Workers (4 Desktop + Laptop): 7.736s
- 6 Workers (4 Desktop + 2 Laptop): 7.527s
- 7 Workers (4 Desktop + 3 Laptop): 6.918s
- 8 Workers (4 Desktop + 4 Laptop): 7.219s | 6.947s | 7.069s

- 9 Workers (4 Desktop + 4 Laptop + EC2): 6.552s
- 10 Workers (4 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.217s

- 11 Workers (5 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.41s || 6.912s
- 12 Workers (6 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.35s
- 13 Workers (7 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.82s
- 14 Workers (8 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.723s

Best Id guess: 
- 4 Desktop + 2 Laptop + 2 Ec2: 5.893s || 5.926
- 4 Desktop + 2 Laptop + 1 Ec2: 6.188s || 6.095s || 6.434s

Weird, T2 Micro gives 1 vCPU with 1 vCore

