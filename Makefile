CFLAGS=-lGL -lSDL2

all: main.o mainpart.o
	g++ main.o mainpart.o $(CFLAGS)

main.o: main.cpp
	g++ -c main.cpp

mainpart.o: mainpart.cpp
	g++ -c mainpart.cpp

run:
	./a.out

clean:
	rm -f a.out
	rm -f main.o
	rm -f mainpart.o
